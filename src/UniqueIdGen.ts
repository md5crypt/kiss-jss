export default class UniqueIdGen {
	private map = new Map<string, number>()

	public static create() {
		return (new this()).generator
	}

	public get generator() {
		return (rule: string, sheet?: string) => this.get(rule, sheet)
	}

	public reset() {
		this.map.clear()
	}

	public get(rule: string, sheet?: string) {
		const id = sheet ? sheet + "-" + rule : rule
		const n = this.map.get(id)
		this.map.set(id, n ? n + 1 : 1)
		return id + (n || "")
	}
}
