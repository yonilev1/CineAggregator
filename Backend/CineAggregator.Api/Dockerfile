FROM mcr.microsoft.com/dotnet/sdk:8.0 AS build
WORKDIR /src
COPY ["CineAggregator.Api.csproj", "./"]
RUN dotnet restore "CineAggregator.Api.csproj"
COPY . .
RUN dotnet publish "CineAggregator.Api.csproj" -c Release -o /app/publish

FROM mcr.microsoft.com/dotnet/aspnet:8.0 AS final
WORKDIR /app
EXPOSE 5000
ENV ASPNETCORE_URLS=http://+:5000
COPY --from=build /app/publish .
ENTRYPOINT ["dotnet", "CineAggregator.Api.dll"]
