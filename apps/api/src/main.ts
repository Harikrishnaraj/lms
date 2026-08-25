import { NestFactory } from '@nestjs/core'
import { AppModule } from './app.module'
import { ValidationPipe } from '@nestjs/common'
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger'

async function bootstrap() {
  const app = await NestFactory.create(AppModule)
  
  // Set global API prefix
  app.setGlobalPrefix('api/v1')

  // Enable validation globally
  app.useGlobalPipes(new ValidationPipe({ transform: true }))

  // Enable CORS
  app.enableCors()

  // Swagger integration
  const config = new DocumentBuilder()
    .setTitle('LMS V2 Headless API')
    .setDescription('LMS V2 API Backend service endpoints description')
    .setVersion('1.0')
    .addTag('lms')
    .build()
  const document = SwaggerModule.createDocument(app, config)
  SwaggerModule.setup('api/v1/docs', app, document)

  const port = process.env.PORT || 5000
  await app.listen(port)
  console.log(`LMS V2 API Server is running on: http://localhost:${port}/api/v1`)
  console.log(`Swagger Documentation is available at: http://localhost:${port}/api/v1/docs`)
}
bootstrap()
