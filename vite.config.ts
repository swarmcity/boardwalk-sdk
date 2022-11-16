import { configDefaults, defineConfig } from 'vitest/config'

export default defineConfig({
	test: {
		exclude: [...configDefaults.exclude, 'lib'],
		globalSetup: ['./test/tests-setup.ts'],
	},
})
