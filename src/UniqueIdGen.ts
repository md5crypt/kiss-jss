export default class UniqueIdGen {
	private _map = new Map<string, number>()

	public static create() {
		return (new this()).generator
	}

	public get generator() {
		return (rule: string, sheet?: string) => this.get(rule, sheet)
	}

	public reset() {
		this._map.clear()
	}

	public get(rule: string, sheet?: string) {
		const id = sheet ? sheet + "-" + rule : rule
		const n = this._map.get(id)
		this._map.set(id, n ? n + 1 : 1)
		return id + (n || "")
	}
}
