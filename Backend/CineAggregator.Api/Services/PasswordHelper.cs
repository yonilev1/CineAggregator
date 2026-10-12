using System;
using System.Security.Cryptography;

namespace CineAggregator.Api.Services
{
    public static class PasswordHelper
    {
        private const int SaltSize = 16;
        private const int KeySize = 32;
        private const int Iterations = 10000;

        public static string HashPassword(string password)
        {
            if (string.IsNullOrEmpty(password)) throw new ArgumentException("Password cannot be empty.");

            using var algorithm = new Rfc2898DeriveBytes(
                password,
                SaltSize,
                Iterations,
                HashAlgorithmName.SHA256);

            var key = Convert.ToBase64String(algorithm.GetBytes(KeySize));
            var salt = Convert.ToBase64String(algorithm.Salt);

            return $"{Iterations}.{salt}.{key}";
        }

        public static bool VerifyPassword(string hash, string password)
        {
            if (string.IsNullOrEmpty(hash) || string.IsNullOrEmpty(password)) return false;

            var parts = hash.Split('.', 3);
            if (parts.Length != 3) return false;

            var iterations = Convert.ToInt32(parts[0]);
            var salt = Convert.FromBase64String(parts[1]);
            var key = parts[2];

            using var algorithm = new Rfc2898DeriveBytes(
                password,
                salt,
                iterations,
                HashAlgorithmName.SHA256);

            var keyToCheck = Convert.ToBase64String(algorithm.GetBytes(KeySize));
            return keyToCheck == key;
        }
    }
}
