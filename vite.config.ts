import { resolve } from 'path'
import { configDefaults, defineConfig } from 'vitest/config'
import dts from 'vite-plugin-dts'

console.log('dirname', __dirname)

export default defineConfig({
	build: {
		target: ['es2020'],
		lib: {
			entry: resolve(__dirname, 'src/index.ts'),
			name: 'Boardwalk SDK',
			fileName: 'boardwalk-sdk',
		},
	},
	test: {
		exclude: [...configDefaults.exclude, 'lib'],
	},
	plugins: [
		dts({
			insertTypesEntry: true,
		}),
	],
})
