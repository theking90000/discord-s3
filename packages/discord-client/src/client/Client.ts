import RestManager from "../rest/RestManager";
import Channel from "./Channel";


export interface ClientOpts {
    token: string;
    selfbot?: boolean;
}


export default class Client {

    private selfbot: boolean;
    private token: string;
    private restManager: RestManager;


    public constructor({token, selfbot}: ClientOpts) {

        this.selfbot = selfbot || false;
        this.token = token;

        this.restManager = new RestManager({
            token: this.selfbot ? token : `Bot ${token}`,
            userAgent: this.selfbot ? "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) discord/0.0.16 Chrome/91.0.4472.164 Electron/13.4.0 Safari/537.36" : undefined
        })
    }

    public getRestManager() {
        return this.restManager;
    }

    public getChannel(id: string) {
        return new Channel(id, this);
    }


}
