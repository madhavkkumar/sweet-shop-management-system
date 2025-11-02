// Test file for authentication endpoints
// Following TDD approach - Red-Green-Refactor pattern

const request = require('supertest');
const app = require('../server');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');

// Use test database
const TEST_DB = './test_sweetshop.db';

describe('Authentication API', () => {
    let db;

    beforeAll((done) => {
        // Setup test database
        db = new sqlite3.Database(TEST_DB, (err) => {
            if (err) {
                console.error('Error opening test database:', err.message);
            }
            done();
        });
    });

    afterAll((done) => {
        // Cleanup test database
        db.close((err) => {
            if (err) {
                console.error('Error closing test database:', err.message);
            }
            done();
        });
    });

    describe('POST /api/auth/register', () => {
        test('should register a new user successfully', async () => {
            const response = await request(app)
                .post('/api/auth/register')
                .send({
                    username: 'testuser',
                    email: 'test@example.com',
                    password: 'password123'
                });

            expect(response.status).toBe(201);
            expect(response.body).toHaveProperty('token');
            expect(response.body).toHaveProperty('user');
            expect(response.body.user.username).toBe('testuser');
            expect(response.body.user.role).toBe('user');
        });

        test('should reject registration with missing fields', async () => {
            const response = await request(app)
                .post('/api/auth/register')
                .send({
                    username: 'testuser2'
                });

            expect(response.status).toBe(400);
            expect(response.body).toHaveProperty('error');
        });

        test('should reject registration with short password', async () => {
            const response = await request(app)
                .post('/api/auth/register')
                .send({
                    username: 'testuser3',
                    email: 'test3@example.com',
                    password: '12345'
                });

            expect(response.status).toBe(400);
            expect(response.body.error).toContain('Password must be at least 6 characters');
        });

        test('should reject duplicate username or email', async () => {
            // First registration
            await request(app)
                .post('/api/auth/register')
                .send({
                    username: 'duplicate',
                    email: 'duplicate@example.com',
                    password: 'password123'
                });

            // Try to register again with same username
            const response = await request(app)
                .post('/api/auth/register')
                .send({
                    username: 'duplicate',
                    email: 'different@example.com',
                    password: 'password123'
                });

            expect(response.status).toBe(400);
            expect(response.body.error).toContain('already exists');
        });
    });

    describe('POST /api/auth/login', () => {
        test('should login with valid credentials', async () => {
            // First register a user
            await request(app)
                .post('/api/auth/register')
                .send({
                    username: 'loginuser',
                    email: 'login@example.com',
                    password: 'password123'
                });

            // Then try to login
            const response = await request(app)
                .post('/api/auth/login')
                .send({
                    username: 'loginuser',
                    password: 'password123'
                });

            expect(response.status).toBe(200);
            expect(response.body).toHaveProperty('token');
            expect(response.body).toHaveProperty('user');
        });

        test('should reject login with invalid credentials', async () => {
            const response = await request(app)
                .post('/api/auth/login')
                .send({
                    username: 'nonexistent',
                    password: 'wrongpassword'
                });

            expect(response.status).toBe(401);
            expect(response.body.error).toContain('Invalid credentials');
        });

        test('should reject login with missing fields', async () => {
            const response = await request(app)
                .post('/api/auth/login')
                .send({
                    username: 'testuser'
                });

            expect(response.status).toBe(400);
            expect(response.body).toHaveProperty('error');
        });
    });
});

