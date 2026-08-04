import { expect, test } from 'bun:test';
import { ProfileAddMachine } from './profile-add-machine';

test('the no-auth path collects name, host, and tls', () => {
  const done = ProfileAddMachine.start()
    .answer('local')
    .answer('http://localhost:9200')
    .answer(false)
    .answer(true);
  expect(done.result).toEqual({
    name: 'local',
    host: 'http://localhost:9200',
    tlsVerify: true,
  });
});

test('the basic-auth path adds username and password', () => {
  const done = ProfileAddMachine.start()
    .answer('secure')
    .answer('https://localhost:9201')
    .answer(true)
    .answer('admin')
    .answer('secret')
    .answer(false);
  expect(done.result).toEqual({
    name: 'secure',
    host: 'https://localhost:9201',
    username: 'admin',
    password: 'secret',
    tlsVerify: false,
  });
});

test('the machine is not done before the tls step', () => {
  const machine = ProfileAddMachine.start().answer('local');
  expect(machine.step).toBe('host');
  expect(machine.result).toBe(undefined);
});

test('a resumed machine starts at the host step with the answer kept', () => {
  const resumed = ProfileAddMachine.start({
    name: 'prod',
    host: 'https://old:9200',
    tlsVerify: true,
  });
  expect(resumed.step).toBe('host');
  expect(resumed.question.fallback).toBe('https://old:9200');
});
