tf-plan:
	AWS_PROFILE="price-watch" terraform -chdir=./terraform/environments/development plan -var-file terraform/environments/development/development.tfvars
tf-apply:
	AWS_PROFILE="price-watch" terraform -chdir=./terraform/environments/development apply -var-file terraform/environments/development/development.tfvars

kleinanzeigen:
	cd ./lambdas/kleinanzeigen && npm ci && npm run build
	zip -j ./lambdas/kleinanzeigen.zip ./lambdas/kleinanzeigen/dist/index.cjs
kleinanzeigen-deploy:
	aws lambda update-function-code --function-name=price-watch-lambda-kleinanzeigen-development --zip-file=fileb://lambdas/kleinanzeigen.zip
