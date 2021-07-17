export default class UniqueIdGen {
	private map = new Map<string, number>()

	public static create() {
		const instance = new this()
		return (rule: string, sheet?: string) => instance.get(rule, sheet)
	}

	public get(rule: string, sheet?: string) {
		const id = sheet ? sheet + "-" + rule : rule
		const n = this.map.get(id)
		this.map.set(id, n ? n + 1 : 1)
		return id + (n || "")
	}
}
