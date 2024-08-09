import type { StandardProperties } from "csstype"

export type JssRuleSet<T extends string> = Record<T, JssRule>

export interface JssRule extends StandardProperties<string | number | (number | string)[], string | number | (number | string)[]> {
	composes?: string
	[key: string]: string | number | JssRule | JssRuleSet<string> | JssRule[] | (number | string)[] | undefined
}

export interface JssOptions {
	defaultUnits?: Record<string, string[]>
	prefixedKeys?: string[]
	sharedSheetName?: string
	idGen: (rule: string, sheet?: string) => string
}

function stringProduct(a: string[] | undefined, b: string[]) {
	const result = []
	if (!a) {
		return b
	}
	for (let i = 0; i < a.length; i += 1) {
		for (let j = 0; j < b.length; j += 1) {
			result.push(a[i] + b[j])
		}
	}
	return result
}

export class Jss {
	private _idGen: (rule: string, sheet?: string) => string
	private _defaultUnits: Map<string, string>
	private _prefixedKeys: Set<string>
	private _shared: Map<string, string>
	private _sharedSheetName?: string
	private _buffer: string[]

	public constructor(options: JssOptions) {
		this._idGen = options.idGen
		this._prefixedKeys = new Set(options.prefixedKeys)
		this._defaultUnits = new Map()
		this._shared = new Map()
		this._sharedSheetName = options.sharedSheetName
		this._buffer = []
		for (const unit in options.defaultUnits) {
			options.defaultUnits[unit].forEach(x => this._defaultUnits.set(x, unit))
		}
	}

	private processFontFace(data: JssRule) {
		return ((Array.isArray(data) ? data : [data]) as JssRule[]).map(x => "@font-face" + this.processRule("normal", x)).join("")
	}

	private processValue(key: string, value: any): string {
		if (typeof value == "string") {
			return value
		} else if (typeof value == "number") {
			return value + (this._defaultUnits.get(key) || "")
		} else if (Array.isArray(value)) {
			return value.map(x => this.processValue(key, x)).join(" ")
		} else {
			return value.toString()
		}
	}

	private processRule(mode: "normal" | "object" | "object-resolve", data: JssRule, path?: string[]) {
		const buffer = [] as string[]
		const items = [] as string[]
		for (const key in data) {
			const item = data[key]
			if (key[0] == "&") {
				buffer.push(this.processRule("normal", item as JssRule, stringProduct(path, key.slice(1).replace(/\$/g, ".$").split(/,/g))))
			} else if (path && key[key.length - 1] == "&") {
				buffer.push(this.processRule("normal", item as JssRule, stringProduct(key.slice(0, -1).replace(/\$/g, ".$").split(/,/g), path)))
			} else if (key[0] == "@") {
				const match = key.match(/^@[^\s]*/)!
				switch (match[0]) {
					case "@keyframes":
						buffer.push(key + "{" + this.processRule("object", item as JssRule) + "}")
						break
					case "@media":
						buffer.push(key + "{" + this.processRule(path ? "object-resolve" : "object", item as JssRule, path) + "}")
						break
					case "@font-face":
						buffer.push(this.processFontFace(item as JssRule))
						break
					default:
						buffer.push(key + " " + item + ";")
				}
			} else if (mode != "normal") {
				buffer.push(this.processRule("normal", item as JssRule, stringProduct(path, [mode == "object-resolve" ? ".$" + key : key])))
			} else if (key != "composes") {
				const keyName = key.replace(/[A-Z]/g, x => "-" + x.toLocaleLowerCase())
				const value = this.processValue(keyName, item)
				items.push(keyName + ":" + value + ";")
				if (this._prefixedKeys.has(keyName)) {
					items.push("-ms-" + keyName + ":" + value + ";")
					items.push("-moz-" + keyName + ":" + value + ";")
					items.push("-webkit-" + keyName + ":" + value + ";")
				}
			}
		}
		return items.length ? (path ? path.join(", ") : "") + "{" + items.join("") + "}" + buffer.join("") : buffer.join("")
	}

	public compile<T extends string>(data: JssRuleSet<T>, sheet?: string) {
		const buffer = [] as string[]
		const classMap = new Map<string, string>()
		const idMap = new Map<string, string>(this._shared)
		for (const key in data) {
			const item = data[key]
			const match = key.match(/^(@[^\s]+)(?:\s+([^\s].*))?/)
			if (match) {
				switch (match[1]) {
					case "@keyframes": {
						const id = this._idGen("keyframes-" + match[2], sheet)
						idMap.set(match[2], id)
						buffer.push("@keyframes " + id + "{" + this.processRule("object", item as JssRule) + "}")
						break
					} case "@media":
						buffer.push(key + "{" + this.processRule("object-resolve", item as JssRule) + "}")
						break
					case "@font-face":
						buffer.push(this.processFontFace(item as JssRule))
						break
					case "@global":
						buffer.push(this.processRule("object", item as JssRule))
						break
					default:
						buffer.push(key + " " + item + ";")
				}
			} else {
				let id
				if (key[0] == "$") {
					const trimmedKey = key.slice(1)
					id = this._shared.get(trimmedKey)
					if (!id) {
						id = this._idGen(trimmedKey, this._sharedSheetName)
						this._shared.set(trimmedKey, id)
						idMap.set(trimmedKey, id)
					}
				} else {
					id = this._idGen(key, sheet)
					idMap.set(key, id)
				}
				classMap.set(key, (item as JssRule).composes ? id + " " + (item as JssRule).composes : id)
				buffer.push(this.processRule("normal", item as JssRule, ["." + id]))
			}
		}
		const source = buffer.join("").replace(/\$([A-Za-z0-9_-]+)/g, (_, x) => idMap.get(x) || x)
		const classes = {} as Record<T, string>
		classMap.forEach((value, key) => classes[key as T] = value.replace(/\$([A-Za-z0-9_-]+)/g, (_, x) => idMap.get(x) || x))
		return {classes, source}
	}

	public inject<T extends string>(target: HTMLStyleElement | null, data: JssRuleSet<T>, sheet?: string) {
		const {classes, source} = this.compile(data, sheet)
		const textNode = document.createTextNode(source)
		if (!target) {
			const style = document.createElement("style")
			style.appendChild(textNode)
			document.head.appendChild(style)
		} else {
			target.appendChild(textNode)
		}
		return classes
	}

	public buffer<T extends string>(data: JssRuleSet<T>, sheet?: string) {
		const {classes, source} = this.compile(data, sheet)
		this._buffer.push(source)
		return classes
	}

	public flush() {
		const style = document.createElement("style")
		style.appendChild(document.createTextNode(this._buffer.join("")))
		document.head.appendChild(style)
	}
}

export default Jss
