#!/bin/bash

# ============================================
# Dynatrace Sporadic Error - INTERLEAVED
# ============================================
DYNATRACE_URL="https://{your-environment-id}.live.dynatrace.com/api/v2/events/ingest"
API_TOKEN="{your-api-token}"

TOTAL_REQUESTS=100
BASE_TS=$(date -u +%s)

random_rt() { echo $((RANDOM % ($2 - $1 + 1) + $1)); }
gen_uuid() { cat /proc/sys/kernel/random/uuid; }
gen_ts() { date -u -d "@$((BASE_TS + $1))" +%Y-%m-%dT%H:%M:%S.%3NZ 2>/dev/null || date -u -d "@$((BASE_TS + $1))" +%Y-%m-%dT%H:%M:%SZ; }

send_event() {
    curl -s -X POST "$DYNATRACE_URL" \
        -H "Authorization: Api-Token $API_TOKEN" \
        -H "Content-Type: application/json" \
        -d "$1" > /dev/null
}

echo "🚀 Dynatrace SPORADIC Error Generator (Interleaved)"
echo "   Total: $TOTAL_REQUESTS request flows"
echo "   Base timestamp: $(date -u -d "@$BASE_TS" +%Y-%m-%dT%H:%M:%SZ)"
echo ""

for i in $(seq 1 $TOTAL_REQUESTS); do
    tx_id=$(gen_uuid)
    uid=$(gen_uuid)
    pid=$(gen_uuid)
    ts_offset=$((i * 3))
    amount=$((RANDOM % 500000 + 10000))
    
    # 40% chance wallet SLOW (sporadic)
    if [ $((RANDOM % 100)) -lt 40 ]; then
        wallet_rt=$((RANDOM % 2000 + 2000))  # 2000-4000ms SLOW
        wallet_slow="true"
        
        # Wallet: 5% actual error, 95% slow but success
        if [ $((RANDOM % 100)) -lt 5 ]; then
            wallet_level="ERROR"; wallet_etype="ERROR_EVENT"
            wallet_msg="Database query timeout"
        else
            wallet_level="INFO"; wallet_etype="CUSTOM_INFO"
            wallet_msg="Balance check"
        fi
    else
        wallet_rt=$((RANDOM % 150 + 50))  # 50-200ms normal
        wallet_slow="false"
        wallet_level="INFO"; wallet_etype="CUSTOM_INFO"
        wallet_msg="Balance check"
    fi
    
    # === WALLET LOG ===
    ts_wallet=$(gen_ts $ts_offset)
    send_event '{
        "eventType":"'$wallet_etype'","title":"[wallet-service] '$wallet_msg'","timeout":30,
        "properties":{"dt.event.allow_davis_merge":"false","service.name":"wallet-service",
        "log.level":"'$wallet_level'","log.message":"'$wallet_msg'","timestamp":"'$ts_wallet'",
        "response_time_ms":"'$wallet_rt'","transaction_id":"'$tx_id'","user_id":"'$uid'",
        "latency_issue":"'$wallet_slow'","root_cause":"'$wallet_slow'"}
    }'
    echo "[wallet]  #$i - $ts_wallet - ${wallet_rt}ms - $wallet_level"
    
    # === PAYMENT LOG (depends on wallet) ===
    ts_payment=$(gen_ts $((ts_offset + 1)))
    
    if [ "$wallet_slow" = "true" ]; then
        # Payment ERROR karena wallet lambat
        payment_rt=$((wallet_rt + RANDOM % 300))
        payment_level="ERROR"; payment_etype="ERROR_EVENT"
        
        case $((RANDOM % 3)) in
            0) payment_msg="Wallet service timeout" ;;
            1) payment_msg="Upstream latency exceeded" ;;
            2) payment_msg="Circuit breaker open" ;;
        esac
        
        send_event '{
            "eventType":"'$payment_etype'","title":"[payment-service] '$payment_msg'","timeout":30,
            "properties":{"dt.event.allow_davis_merge":"false","service.name":"payment-service",
            "log.level":"'$payment_level'","log.message":"'$payment_msg'","timestamp":"'$ts_payment'",
            "response_time_ms":"'$payment_rt'","transaction_id":"'$tx_id'","user_id":"'$uid'",
            "payment_id":"'$pid'","amount":"'$amount'","upstream_service":"wallet-service",
            "upstream_latency_ms":"'$wallet_rt'","sporadic_error":"true","root_cause":"false"}
        }'
    else
        # Payment SUCCESS
        payment_rt=$((wallet_rt + RANDOM % 100 + 50))
        payment_level="INFO"; payment_etype="CUSTOM_INFO"
        payment_msg="Payment success"
        
        send_event '{
            "eventType":"'$payment_etype'","title":"[payment-service] '$payment_msg'","timeout":30,
            "properties":{"dt.event.allow_davis_merge":"false","service.name":"payment-service",
            "log.level":"'$payment_level'","log.message":"'$payment_msg'","timestamp":"'$ts_payment'",
            "response_time_ms":"'$payment_rt'","transaction_id":"'$tx_id'","user_id":"'$uid'",
            "payment_id":"'$pid'","amount":"'$amount'","bni_ref":"BNI-'$RANDOM'"}
        }'
    fi
    echo "[payment] #$i - $ts_payment - ${payment_rt}ms - $payment_level"
    echo "---"
done

echo ""
echo "✅ Done! Total: $((TOTAL_REQUESTS * 2)) events (wallet + payment pairs)"
