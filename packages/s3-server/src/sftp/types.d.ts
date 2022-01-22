export interface Attr {
  size?: number;
  uid?: number;
  gid?: number;
  mode?: number;
  atime?: number;
  mtime?: number;
}

export interface ResponderDir {
  on(ev: "dir", callback: () => void);
  file(f: string, attr?: Attr);
  end();
}

export interface Responder {
  fail();
  nofile();
  denied();
  bad_message();
  unsupported();
  ok();
}

export interface Session {
  on(ev: "readdir", callback: (path: string, responder: ResponderDir) => void);
  on(ev: "readfile", callback: (path: string, stream: any) => void);
  on(ev: "writefile", callback: (path: string, readStream: any) => void);
  on(ev: "stat", callback: (path: string, kind: any, stream: any) => void);
  on(ev: "mkdir", callback: (path: string, responder: Responder) => void);
  on(
    ev: "realpath",
    callback: (path: string, callback: (path: string) => void) => void
  );
  on(ev: "rmdir", callback: (path: string, responder: Responder) => void);
  on(ev: "delete", callback: (path: string, responder: Responder) => void);
  on(
    ev: "rename",
    callback: (oldPath: string, newPath: string, responder: Responder) => void
  );
  on(ev: "error", callback: (error: Error) => void);
  on(ev: "*", callback: (data: any) => void);
}

export interface Auth {
  method: "password";
  username?: string;
  password?: string;
  accept(callback: (session: Session) => void);
  reject(reason: string[], b: boolean);
}

export interface Opts {
  privateKeyFile?: string;
  debug?: boolean;
}

declare module "node-sftp-server" {
  export default class SFTPServer {
    constructor(opts: Opts);
    listen(port: number);
    on(ev: "connect", callback: (auth: Auth) => void);
    on(ev: "error", callback: (error: Error) => void);
  }
}
