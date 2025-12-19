import { Global, Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { ConfigModule, ConfigType } from '@nestjs/config';
import { HttpClientService } from './http-client.service';
import httpConfig from '../config/http.config';

@Global()
@Module({
  imports: [
    HttpModule.registerAsync({
      imports: [ConfigModule],
      inject: [httpConfig.KEY],
      useFactory: (httpSettings: ConfigType<typeof httpConfig>) => ({
        timeout: httpSettings.timeout,
        maxRedirects: httpSettings.maxRedirects
      })
    })
  ],
  providers: [HttpClientService],
  exports: [HttpClientService, HttpModule]
})
export class HttpClientModule {}
