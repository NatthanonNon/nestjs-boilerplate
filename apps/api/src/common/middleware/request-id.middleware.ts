import { randomUUID } from 'crypto';
import { Request, Response, NextFunction } from 'express';
import { isUUID } from 'class-validator';
import { runWithRequestContext } from '../context/request-context';

export function requestIdMiddleware(req: Request, res: Response, next: NextFunction) {
  const incoming = req.header('x-request-id');
  const requestId = incoming && isUUID(incoming) ? incoming : randomUUID();

  req.requestId = requestId;
  res.setHeader('x-request-id', requestId);

  runWithRequestContext({ requestId }, () => next());
}
