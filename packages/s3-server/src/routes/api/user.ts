import fp from "fastify-plugin";
import {FastifyInstance, FastifyReply, HookHandlerDoneFunction} from "fastify";
import {CustomRequest} from "../../index";


export default function (fastify: FastifyInstance,opts: {}, done: HookHandlerDoneFunction) {

    fastify.get('/me', async (req: CustomRequest,res: FastifyReply) => {
        return req.user?.get();
    })

    done()

}
