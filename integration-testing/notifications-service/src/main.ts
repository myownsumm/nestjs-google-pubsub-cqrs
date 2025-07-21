import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

async function bootstrap() {
  try {
    console.log('🚀 Starting notifications-service...');
    console.log('Environment check:');
    console.log('- NODE_ENV:', process.env.NODE_ENV);
    console.log('- PORT:', process.env.PORT ?? 3004);
    console.log('- PUBSUB_EMULATOR_HOST:', process.env.PUBSUB_EMULATOR_HOST || 'not set');
    
    const app = await NestFactory.create(AppModule);
    
    const port = process.env.PORT ?? 3004;
    await app.listen(port);
    
    console.log(`✅ Notifications-service is listening on port ${port}`);
  } catch (error) {
    console.error('❌ Failed to start notifications-service:', error);
    console.error('Error stack:', error.stack);
    process.exit(1);
  }
}

bootstrap();
