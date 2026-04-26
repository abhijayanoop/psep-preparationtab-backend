import App from "@/app";
import IndexRoute from "@routes/index.route";
import UsersRoute from "@routes/users.route";
import validateEnv from "@utils/validateEnv";
import PreparationRoute from "./routes/preparation.route";

validateEnv();

const app = new App([
  new IndexRoute(),
  new UsersRoute(),
  new PreparationRoute(),
]);

app.listen();
