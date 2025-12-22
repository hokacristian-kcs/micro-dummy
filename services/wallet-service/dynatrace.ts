// Dynatrace Integration Helper

const DYNATRACE_URL = process.env.DYNATRACE_URL;
const DYNATRACE_TOKEN = process.env.DYNATRACE_TOKEN;

// ============ EVENTS ============
export const sendLog = async (level: 'INFO' | 'WARN' | 'ERROR', service: string, message: string, data?: unknown) => {
  const timestamp = new Date().toISOString();
  
  // Console log selalu
  console.log(`[${timestamp}] [${level}] [${service}] ${message}`, data ? JSON.stringify(data) : '');
  
  if (!DYNATRACE_URL || !DYNATRACE_TOKEN) return;
  
  const eventType = level === 'ERROR' ? 'ERROR_EVENT' : level === 'WARN' ? 'CUSTOM_ALERT' : 'CUSTOM_INFO';
  
  // Convert data object to string properties
  const properties: Record<string, string> = {
    'dt.event.allow_davis_merge': 'false',
    'service.name': service,
    'log.level': level,
    'log.message': message,
    'timestamp': timestamp,
  };
  if (data && typeof data === 'object') {
    Object.entries(data).forEach(([k, v]) => {
      properties[k] = String(v);
    });
  }
  
  try {
    const res = await fetch(`${DYNATRACE_URL}/api/v2/events/ingest`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Api-Token ${DYNATRACE_TOKEN}`,
      },
      body: JSON.stringify({
        eventType,
        title: `[${service}] ${message}`,
        timeout: 30,
        properties,
      }),
    });
    
    const resText = await res.text();
    if (!res.ok) {
      console.error(`[DYNATRACE] Event ingest failed: ${res.status} ${resText}`);
    } else {
      console.log(`[DYNATRACE] Event sent: ${resText}`);
    }
  } catch (e: any) {
    console.error(`[DYNATRACE] Event error: ${e.message}`);
  }
};

// ============ METRICS (DISABLED) ============
export const sendMetric = async (_service: string, _metricName: string, _value: number, _dimensions?: Record<string, string>) => {
  // Disabled - token missing metrics.ingest scope
};

// ============ MIDDLEWARE ============
export const dynatraceMiddleware = (service: string) => {
  return async (c: any, next: () => Promise<void>) => {
    const start = Date.now();
    const method = c.req.method;
    const path = c.req.path;
    
    try {
      await next();
    } catch (e: any) {
      const duration = Date.now() - start;
      await sendLog('ERROR', service, `${method} ${path} failed`, { error: e.message, duration: String(duration) });
      throw e;
    }
  };
};
