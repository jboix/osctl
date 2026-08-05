import { expect, test } from 'bun:test';
import { describeFailure } from './failure';

test('a cluster response becomes a status message with pretty details', () => {
  const report = describeFailure({
    meta: {
      statusCode: 404,
      body: { error: { type: 'index_not_found_exception' } },
    },
  });
  expect(report.message).toBe('The cluster responded with status 404.');
  expect(report.details).toBe(
    JSON.stringify({ error: { type: 'index_not_found_exception' } }, null, 2),
  );
});

test('a connection error becomes a could-not-reach message', () => {
  const error = new Error('connect ECONNREFUSED 127.0.0.1:9200');
  error.name = 'ConnectionError';
  expect(describeFailure(error)).toEqual({
    message:
      'The cluster could not be reached: connect ECONNREFUSED 127.0.0.1:9200.',
  });
});

test('another error becomes a request-failed message', () => {
  expect(describeFailure(new Error('boom'))).toEqual({
    message: 'The request failed: boom.',
  });
});

test('a thrown non-error is stringified', () => {
  expect(describeFailure('what')).toEqual({ message: 'what' });
});
