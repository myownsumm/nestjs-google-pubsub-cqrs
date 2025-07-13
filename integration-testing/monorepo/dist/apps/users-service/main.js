"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const core_1 = require("@nestjs/core");
const users_service_module_1 = require("./users-service.module");
async function bootstrap() {
    const app = await core_1.NestFactory.create(users_service_module_1.UsersServiceModule);
    await app.listen(process.env.port ?? 3000);
}
bootstrap();
//# sourceMappingURL=main.js.map