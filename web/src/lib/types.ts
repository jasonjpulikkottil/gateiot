// ============================================================
// GateIoT — Database Row Types
// ============================================================

export interface Employee {
  id: string;
  name: string;
  email: string | null;
  department: string | null;
  card_uid: string;
  shift_start: string; // "HH:MM"
  shift_end: string;   // "HH:MM"
  created_at: string;
}

export interface SwipeLog {
  id: string;
  employee_id: string | null;
  card_uid: string;
  swipe_type: 'entry' | 'exit' | 'denied' | 'unknown';
  temperature: number | null;
  humidity: number | null;
  granted: boolean;
  swiped_at: string;
  // joined
  employees?: Pick<Employee, 'name' | 'department' | 'shift_start' | 'shift_end'> | null;
}

export interface ModelWeight {
  id: string;
  version: number;
  weights: object;
  metrics: {
    loss?: number;
    accuracy?: number;
    epochs?: number;
    sampleCount?: number;
    [key: string]: unknown;
  } | null;
  trained_at: string;
  trained_by: string | null;
}

// ============================================================
// API Payloads
// ============================================================

/** POST /api/swipe — sent by Python gateway */
export interface SwipeRequest {
  uid: string;    // uppercase hex e.g. "6E8A2407"
  temp: number;
  hum: number;
}

/** Response from POST /api/swipe — Python reads this to send GRANT/DENY over serial */
export interface SwipeResponse {
  granted: boolean;
  type?: 'entry' | 'exit';
  name?: string;
  department?: string;
  reason?: 'daily_limit' | 'unknown_card' | 'server_error' | 'invalid_entry_time' | 'invalid_exit_time';
  swipe_count?: number;
}

/** Dashboard stats */
export interface DailyStats {
  totalEntries: number;
  totalExits: number;
  totalDenied: number;
  presentNow: number;
  avgTemp: number;
  avgHumidity: number;
}
