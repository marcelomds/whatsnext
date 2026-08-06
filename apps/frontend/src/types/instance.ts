export interface InstanceStatus {
  instanceName: string;
  state: string;
}

export interface ConnectResponse {
  instance?: InstanceStatus;
  base64?: string;
  qrcode?: { base64: string };
}
