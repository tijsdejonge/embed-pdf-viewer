// Angular adapter to make shared components work with Angular
export {
  Component,
  Inject,
  Injectable,
  InjectionToken,
  Input,
  OnDestroy,
  OnInit,
  Optional,
} from '@angular/core';
export { BehaviorSubject, Observable } from 'rxjs';

// Framework-agnostic primitives for shared components
export type JSX = any; // Angular templates don't use JSX but this enables shared type compatibility

import { InjectionToken } from '@angular/core';
// Angular-specific state management
import { BehaviorSubject } from 'rxjs';

export function useState<T>(initialValue: T): [BehaviorSubject<T>, (value: T) => void] {
  const subject = new BehaviorSubject(initialValue);
  const setState = (value: T) => subject.next(value);
  return [subject, setState];
}

export function useEffect(fn: () => (() => void) | void, deps?: any[]) {
  // In Angular, lifecycle methods would be used instead
  // This is a compatibility shim for shared components
  return fn;
}

export function useRef<T>(initialValue: T) {
  // In Angular, ViewChild or simple properties would be used
  return { current: initialValue };
}

export function useContext<T>(context: any) {
  // Angular uses dependency injection instead of context
  throw new Error(
    'useContext should not be used directly in Angular. Use dependency injection instead.',
  );
}

export function createContext<T>(defaultValue: T) {
  // Angular uses InjectionToken instead
  return new InjectionToken<T>('CONTEXT');
}
