import { AppService } from './app.service';

describe('AppService', () => {
  it('returns status message', () => {
    const service = new AppService();
    expect(service.getHello()).toEqual({ message: 'NestJS boilerplate is running' });
  });
});
