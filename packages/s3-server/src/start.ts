import startServer from "./index";


startServer({
    logger: (data) => process.stdout.write(data)
})

