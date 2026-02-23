<script lang="ts">
	interface Props {
		value: string
		id?: string
		'aria-label'?: string
		class?: string
	}

	let { value = $bindable(''), id, 'aria-label': ariaLabel, class: klass = '' }: Props = $props()

	function parse(v: string): [string, string] {
		if (v && /^\d{1,2}:\d{1,2}$/.test(v)) {
			const [h, m] = v.split(':')
			return [(h ?? '').padStart(2, '0'), (m ?? '').padStart(2, '0')]
		}
		return ['00', '00']
	}

	const [initH, initM] = parse(value)
	let hh = $state(initH)
	let mm = $state(initM)

	let hhRef = $state<HTMLInputElement | null>(null)
	let mmRef = $state<HTMLInputElement | null>(null)

	function commit() {
		value = `${hh.padStart(2, '0')}:${mm.padStart(2, '0')}`
	}

	function onHoursKeydown(e: KeyboardEvent) {
		if (
			e.key === 'Backspace' ||
			e.key === 'Delete' ||
			e.key === 'Tab' ||
			e.key.startsWith('Arrow') ||
			e.ctrlKey ||
			e.metaKey
		)
			return
		if (!/^\d$/.test(e.key)) e.preventDefault()
	}

	function onHoursInput(e: Event) {
		const input = e.currentTarget as HTMLInputElement
		let v = input.value.replace(/\D/g, '').slice(0, 2)
		if (v.length === 2 && parseInt(v) > 23) v = '23'
		hh = v
		input.value = v
		commit()
		if (v.length === 2) {
			mmRef?.focus()
			mmRef?.select()
		}
	}

	function onHoursBlur() {
		hh = hh.padStart(2, '0') || '00'
		commit()
	}

	function onMinutesKeydown(e: KeyboardEvent) {
		if (e.key === 'Backspace' && (e.currentTarget as HTMLInputElement).value === '') {
			hhRef?.focus()
			hhRef?.select()
			return
		}
		if (
			e.key === 'Backspace' ||
			e.key === 'Delete' ||
			e.key === 'Tab' ||
			e.key.startsWith('Arrow') ||
			e.ctrlKey ||
			e.metaKey
		)
			return
		if (!/^\d$/.test(e.key)) e.preventDefault()
	}

	function onMinutesInput(e: Event) {
		const input = e.currentTarget as HTMLInputElement
		let v = input.value.replace(/\D/g, '').slice(0, 2)
		if (v.length === 2 && parseInt(v) > 59) v = '59'
		mm = v
		input.value = v
		commit()
	}

	function onMinutesBlur() {
		mm = mm.padStart(2, '0') || '00'
		commit()
	}
</script>

<div
	aria-label={ariaLabel}
	class="flex items-center gap-1 rounded-lg border border-gray-300 bg-gray-50 px-2.5 py-2 text-sm text-gray-900 focus-within:border-blue-500 focus-within:ring-1 focus-within:ring-blue-500 {klass}"
>
	<!-- Icône horloge -->
	<svg
		class="h-4 w-4 shrink-0 text-gray-400"
		aria-hidden="true"
		xmlns="http://www.w3.org/2000/svg"
		fill="currentColor"
		viewBox="0 0 24 24"
	>
		<path
			fill-rule="evenodd"
			d="M2 12C2 6.477 6.477 2 12 2s10 4.477 10 10-4.477 10-10 10S2 17.523 2 12Zm11-4a1 1 0 1 0-2 0v4a1 1 0 0 0 .293.707l3 3a1 1 0 0 0 1.414-1.414L13 11.586V8Z"
			clip-rule="evenodd"
		/>
	</svg>

	<!-- Heures -->
	<input
		bind:this={hhRef}
		{id}
		type="text"
		inputmode="numeric"
		maxlength="2"
		placeholder="00"
		value={hh}
		onkeydown={onHoursKeydown}
		oninput={onHoursInput}
		onblur={onHoursBlur}
		onfocus={() => hhRef?.select()}
		class="w-7 bg-transparent text-center outline-none"
	/>

	<span class="select-none text-gray-400">:</span>

	<!-- Minutes -->
	<input
		bind:this={mmRef}
		type="text"
		inputmode="numeric"
		maxlength="2"
		placeholder="00"
		value={mm}
		onkeydown={onMinutesKeydown}
		oninput={onMinutesInput}
		onblur={onMinutesBlur}
		onfocus={() => mmRef?.select()}
		class="w-7 bg-transparent text-center outline-none"
	/>
</div>
