declare module "node-sftp-server" {
  export default class SFTPServer {
    constructor(opts);
    listen(port: number);
    on(ev: "connect", callback: (auth) => void);
    on(ev: "error", callback: (error: Error) => void);
  }
}
