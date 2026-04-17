.PHONY: install uninstall test lint clean demo demo-named demo-file

# 安装到系统 (npm global)
install:
	npm install -g .

# 卸载
uninstall:
	npm uninstall -g tier

# 运行测试
test:
	npm test

# 代码检查
lint:
	npx eslint src/

# 演示: 基本用法
demo:
	node bin/tier.js -c "echo 'Hello World! 1'" -c "echo 'Hello World! 2'" -c "echo 'Hello World! 3'"

# 演示: 带命名面板
demo-named:
	node bin/tier.js -c '{"name":"server","exec":"echo Hello World 1"}' -c '{"name":"logs","exec":"echo Hello World 2"}' -c '{"name":"monitor","exec":"echo Hello World 3"}'

# 演示: 从配置文件启动
demo-file:
	node bin/tier.js -f examples/tier.json

# 清理
clean:
	rm -rf node_modules
