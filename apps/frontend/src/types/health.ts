export interface HealthResponse {
  status: string;
  timestamp: string;
  checks: {
    dynamodb: boolean;
    claude: boolean;
    googleCalendar: boolean;
  };
}
