import { resolve } from 'path'
import { configDefaults, defineConfig } from 'vitest/config'

console.log('dirname', __dirname)

export default defineConfig({
	build: {
		lib: {
			entry: resolve(__dirname, 'src/index.ts'),
			name: 'Boardwalk SDK',
			fileName: 'boardwalk-sdk',
		},
	},
	test: {
		exclude: [...configDefaults.exclude, 'lib'],
	},
})
