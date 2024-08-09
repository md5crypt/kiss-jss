# KISS-JSS

A tiny (~2kB minified) zero-dependency css-in-js solution that is syntax compatible with JSS.

## But... why?

Basically I got annoyed with the size of the JSS lib. I get it does a lot of things and is made to be extendable and so on, but common.

This is a tiny replacement that implements features of the JSS core with the following plugins enabled:

- jss-plugin-global
- jss-plugin-nested
- jss-plugin-compose
- jss-plugin-camel-case
- jss-plugin-default-unit
- jss-plugin-vendor-prefixer

Also extra stuff I added on the way:

### Shared classes

If a class name starts from `$` it will become a shared class. It can be referenced in all style compiled using the same s instance. `sharedSheetName` defined in Jss constructor options will be passed to id generator for shared classes.

### Suffix ampersand

In addition to normal prefix ampersand syntax (`"& something"`) suffix ampersand (`"something &"`) can be used. It will paste current class path after given string instead of before. Example:

```javascript
{
	foo: {
	}
	bar: {
		"& $foo" {
			// .bar .foo
		}
		"$foo &" {
			// .foo .bar
		}
	}
}
```

### Array values

Arrays can be used as property values, for example:

```javascript
{
	foo: {
		padding: [0, 0],
		border: [1, "solid", "white"]
	}
}
```

The arrays will be joined using `" "` as a delimiter, respecting default units for numeric values.

## Live demo

https://md5crypt.github.io/kiss-jss

## Api

I did not bother to make the api compatible, I just made sure the style syntax is compatible. Most notably all runtime features are dropped, but I never used them anyway so `¯\_(ツ)_/¯`

### `JssOptions`

The main class constructor options.

```typescript
interface JssOptions {

	// lut table to use for default unit support
	// format: {"px": ["border-left", "border-right"], "ms": ["animation-delay"]}
	defaultUnits: Record<string, string[]>

	// lut table for autoprefixer
	// format: ["user-select", "transform"]
	prefixedKeys: string[]

	// name of the sheet that will contain shared classes
	sharedSheetName?: string

	// callback for generating class names
	idGen: (rule: string, sheet?: string) => string

}
```

### `JssRuleSet`

The type for the style declarations, parametric to keep the object literal's keys.

Intellisense should work fine, css parameter name / value types are taken from the `csstype` module.

```typescript
type JssRuleSet<T extends string> = Record<T, JssRule>
```

### `Jss`

The main class that does the thing.

```typescript
class Jss {

	// see above for JssOptions description
	constructor(options: JssOptions)

	// compile a jss style object into css source and return it without injecting it anywhere.
	// sheet gets passed to idGen as-is.
	// returns the css source and an object with the class name mapping.
	compile<T extends string>(data: JssRuleSet<T>, sheet?: string): {classes: Record<T, string>, source: string}

	// compile a jss style object into css source and inject it to target.
	// if target is null a new style tag is created.
	// sheet gets passed to idGen as-is.
	// returns an object with the class name mapping.
	inject<T extends string>(target: HTMLStyleElement | null, data: JssRuleSet<T>, sheet?: string): Record<T, string>

	// compile a jss style object into css source and buffer it in internal buffer.
	// sheet gets passed to idGen as-is.
	// returns an object with the class name mapping.
	buffer<T extends string>(data: JssRuleSet<T>, sheet?: string): Record<T, string>

	// inject all buffered styles to head and clear buffer
	flush()
}
```

## Extra goodies

Some extra stuff included in the npm module that is not imported by default.

### `UniqueIdGen`

A simple id get that just glues `sheet` with `rule` adding a hyphen in between. It makes sure the name are uniqe, if there is a duplicate it adds a number on the end to avoid collisions.

Usage:

```typescript
import UniqueIdGen from "kiss-jss/lib/UniqueIdGen"
const idGen = UniqueIdGen.create()
```
### `defaultUnits`

A object with default units configuration copied over from jss-plugin-default-unit.

Usage:

```typescript
import defaultUnits from "kiss-jss/lib/defaultUnits"
```

## Full example

Here is a example that uses all the stuff

```typescript
import { Jss, JssRuleSet } from "kiss-jss"
import UniqueIdGen from "kiss-jss/lib/UniqueIdGen"
import defaultUnits from "kiss-jss/lib/defaultUnits"

const instance = new Jss({
	idGen: UniqueIdGen.create(),
	defaultUnits,
	sharedSheetName: "shared",
	prefixedKeys: [
		"user-select"
	]
})

export default function createStyles<T extends string>(sheet: string, styles: JssRuleSet<T>) {
	return instance.inject(null, styles, sheet)
}
```
