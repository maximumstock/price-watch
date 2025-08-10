tf-plan:
	AWS_PROFILE="price-watch" terraform -chdir=./terraform/environments/development plan -var-file development.tfvars
tf-apply:
	AWS_PROFILE="price-watch" terraform -chdir=./terraform/environments/development apply -var-file development.tfvars

kleinanzeigen:
	cd ./packages/kleinanzeigen && npm ci && npm run build
	zip -j ./packages/kleinanzeigen.zip ./packages/kleinanzeigen/dist/index.cjs
kleinanzeigen-deploy:
	AWS_PROFILE="price-watch" aws lambda update-function-code --function-name=price-watch-lambda-kleinanzeigen-development --zip-file=fileb://packages/kleinanzeigen.zip
