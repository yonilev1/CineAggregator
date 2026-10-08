import pika
import json
import os
import time

def get_connection():
    """Create a connection to RabbitMQ with retry logic."""
    host = os.environ.get("RABBITMQ_HOST", "localhost")
    port = int(os.environ.get("RABBITMQ_PORT", "5672"))
    
    for attempt in range(10):
        try:
            connection = pika.BlockingConnection(
                pika.ConnectionParameters(host=host, port=port)
            )
            print(f"Connected to RabbitMQ at {host}:{port}")
            return connection
        except Exception as e:
            print(f"RabbitMQ connection attempt {attempt + 1} failed: {e}")
            time.sleep(5)
    
    raise Exception("Could not connect to RabbitMQ after 10 attempts")

def send_movie(channel, movie):
    """Send a movie message to the movies queue."""
    channel.queue_declare(queue="movies", durable=True)
    channel.basic_publish(
        exchange="",
        routing_key="movies",
        body=json.dumps(movie),
        properties=pika.BasicProperties(delivery_mode=2)
    )
    print(f"Sent movie: {movie.get('title', 'Unknown')}")
