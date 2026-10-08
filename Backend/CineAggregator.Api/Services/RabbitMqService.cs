using CineAggregator.Api.Models;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;
using Newtonsoft.Json;
using RabbitMQ.Client;
using RabbitMQ.Client.Events;
using System;
using System.Text;
using System.Threading;
using System.Threading.Tasks;

namespace CineAggregator.Api.Services
{
    public class RabbitMqService : BackgroundService
    {
        private readonly IConfiguration _configuration;
        private readonly ILogger<RabbitMqService> _logger;
        private readonly IServiceProvider _serviceProvider;
        private IConnection _connection;
        private IModel _channel;

        public RabbitMqService(IConfiguration configuration, ILogger<RabbitMqService> logger, IServiceProvider serviceProvider)
        {
            _configuration = configuration;
            _logger = logger;
            _serviceProvider = serviceProvider;
        }

        protected override async Task ExecuteAsync(CancellationToken stoppingToken)
        {
            string host = _configuration["RabbitMq:Host"] ?? "localhost";
            int port = _configuration.GetValue<int>("RabbitMq:Port", 5672);
            
            var factory = new ConnectionFactory()
            {
                HostName = host,
                Port = port
            };

            int retryCount = 0;
            while (retryCount < 10 && !stoppingToken.IsCancellationRequested)
            {
                try
                {
                    _connection = factory.CreateConnection();
                    _channel = _connection.CreateModel();
                    _channel.QueueDeclare(queue: "movies",
                                         durable: true,
                                         exclusive: false,
                                         autoDelete: false,
                                         arguments: null);
                    
                    _logger.LogInformation("Connected to RabbitMQ.");
                    break;
                }
                catch (Exception ex)
                {
                    _logger.LogWarning($"Failed to connect to RabbitMQ (attempt {retryCount + 1}): {ex.Message}");
                    retryCount++;
                    await Task.Delay(5000, stoppingToken);
                }
            }

            if (_channel != null)
            {
                var consumer = new EventingBasicConsumer(_channel);
                consumer.Received += (model, ea) =>
                {
                    var body = ea.Body.ToArray();
                    var message = Encoding.UTF8.GetString(body);
                    
                    try
                    {
                        var movie = JsonConvert.DeserializeObject<Movie>(message);
                        if (movie != null)
                        {
                            using (var scope = _serviceProvider.CreateScope())
                            {
                                var movieService = scope.ServiceProvider.GetRequiredService<MovieService>();
                                movieService.ProcessMovie(movie);
                            }
                            _logger.LogInformation($"Processed movie: {movie.Title}");
                        }
                    }
                    catch (Exception ex)
                    {
                        _logger.LogError($"Error processing message: {ex.Message}");
                    }
                };

                _channel.BasicConsume(queue: "movies",
                                     autoAck: true,
                                     consumer: consumer);
            }

            while (!stoppingToken.IsCancellationRequested)
            {
                await Task.Delay(1000, stoppingToken);
            }
        }

        public override void Dispose()
        {
            _channel?.Dispose();
            _connection?.Dispose();
            base.Dispose();
        }
    }
}
