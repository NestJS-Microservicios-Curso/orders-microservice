import { ArgumentsHost, Catch, RpcExceptionFilter } from '@nestjs/common';
import { RpcException } from '@nestjs/microservices';
import { Observable } from 'rxjs';
import { Response } from 'express';
import { RpcErrorResponse } from './dto/RpcErrorResponse';

@Catch(RpcException)
export class RpcCustomExceptionFilter implements RpcExceptionFilter<RpcException> {
  catch(exception: RpcException, host: ArgumentsHost): Observable<any> {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();

    const rpcError = exception.getError();

    if (
      typeof rpcError === 'object' &&
      rpcError !== null &&
      'status' in rpcError &&
      'message' in rpcError
    ) {
      const error = rpcError as RpcErrorResponse;
      const status = isNaN(Number(error.status)) ? 400 : Number(error.status);
      return response.status(status).json(error) as unknown as Observable<any>;
    }

    return response.status(400).json({
      status: 400,
      message: rpcError,
    }) as unknown as Observable<any>;
  }
}
