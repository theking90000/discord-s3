import startServer from "./index";

startServer({
  logger: (data) => {} /*process.stdout.write(data)*/,
  port: Number(process.env.SERVER_PORT) || 9000,
  sftpServerPort: process.env.SFTP_SERVER_PORT
    ? Number(process.env.SFTP_SERVER_PORT)
    : undefined,
});

process.on("SIGINT", () => {
  console.log("exit");
  process.exit();
});
