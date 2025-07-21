import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

async function bootstrap() {
  try {
    console.log('🚀 Starting users-service...');
    console.log('Environment check:');
    console.log('- NODE_ENV:', process.env.NODE_ENV);
    console.log('- PORT:', process.env.PORT ?? 3000);
    console.log('- PUBSUB_EMULATOR_HOST:', process.env.PUBSUB_EMULATOR_HOST || 'not set');
    
    const app = await NestFactory.create(AppModule);
    
    const port = process.env.PORT ?? 3000;
    await app.listen(port);
    
    console.log(`✅ Users-service is listening on port ${port}`);
  } catch (error) {
    console.error('❌ Failed to start users-service:', error);
    console.error('Error stack:', error.stack);
    process.exit(1);
  }
}

bootstrap();
