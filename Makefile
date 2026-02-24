lint:
	@prettier --write "src/**/*.ts"

up:
	sudo docker compose -f docker-compose.yml --env-file .env.docker down
	sudo docker compose -f docker-compose.yml --env-file .env.docker up --build 
	sudo docker image prune -f

down:
	sudo docker compose -f docker-compose.yml --env-file .env.docker down
	sudo docker image prune -f