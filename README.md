# Log Unstable Selector Fn

## Background

As per the React Redux `useSelector()` [documentation](https://react-redux.js.org/api/hooks#useselector), a selector function should be pure. This means that if executed twice with the same parameters, it should always return the same value (or object reference).

To help achieve this, in React Redux v8.1.0, 2 new development mode flags were added: `stabilityCheck` and `noopCheck`. These will warn in the console if the selector function is returning an unstable value or is returning the root state (which you never want to do). These can be set on the provider e.g.

```
<Provider store={store} stabilityCheck="always" noopCheck="always">
  {children}
</Provider>
```

For codebases that existed well before v8.1.0, they will have many usages of `useSelector()` that were't able to make use of these 2 new helpful flags.

## Solution

This is a simple static code analysis script. It will analyse all files (of given extensions) in the directory (and sub directories) of which it is placed. It will find all usages of `useSelector()` and will try to determine whether the selector function passed into it returns a stable value or not. If it is identified to be stable, nothing will be logged to the console. If it is unstable, an error will be logged to the console. If the script is unsure, a warning will be logged to the console and the developer can analyse it further.

## Examples

A good usage of `useSelector()` with a stable selector function:

```
const foo = useSelector((state) => state.bar.baz);
```

A bad usage of `useSelector()` with an unstable selector function:

```
const foo = useSelector((state) => state.bar.baz.map(b => b))
```

There are many more function structure variations for both stable and unstable functions. The script will try to identify them and log them accordingly.
