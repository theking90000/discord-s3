export default class RestError {

    message?: string;
    code?: number;
    status: number;


    constructor(status: number,message?: string, code?: number) {
        this.message = message;
        this.code = code;
        this.status = status;
    }
}