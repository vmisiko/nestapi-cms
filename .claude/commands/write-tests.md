# Write Tests — NestJS Backend

Write comprehensive Jest unit tests for the NestJS backend, following the clean architecture layer structure.

## Context

This is a NestJS 11 backend for City Mega Church CMS. It uses:
- **Clean architecture**: domain (use-cases) → application (services) → infrastructure (TypeORM repositories) → presentation (controllers)
- **Either pattern**: `Either<DataError, T>` for all data operations — never bare try/catch
- **TypeORM** with PostgreSQL
- **JWT auth** via `@nestjs/passport` and `passport-jwt`
- **class-validator** DTOs

## What to Test per Layer

### 1. Domain — Use-Cases (`src/<module>/domain/usecases/`)
Pure unit tests. No NestJS, no TypeORM. Mock only the `IRepository` interface.

```typescript
// Example pattern
describe('CreateUserUseCase', () => {
  let useCase: CreateUserUseCase;
  let mockRepo: jest.Mocked<IUserRepository>;

  beforeEach(() => {
    mockRepo = {
      findByEmail: jest.fn(),
      create: jest.fn(),
      // ...
    } as any;
    useCase = new CreateUserUseCase(mockRepo);
  });

  it('returns conflict error when email already exists', async () => {
    mockRepo.findByEmail.mockResolvedValue(Either.right(existingUser));
    const result = await useCase.execute({ email: 'x@x.com', passwordHash: 'hash' });
    expect(result.isLeft()).toBe(true);
    expect(result.fold(e => e.kind, () => null)).toBe('ConflictError');
  });

  it('creates user when email is new', async () => {
    mockRepo.findByEmail.mockResolvedValue(Either.right(null));
    mockRepo.create.mockResolvedValue(Either.right(newUser));
    const result = await useCase.execute({ email: 'x@x.com', passwordHash: 'hash' });
    expect(result.isRight()).toBe(true);
  });
});
```

### 2. Application — Services (`src/<module>/application/`)
Unit tests. Mock the repository. Test that:
- Successful use-case results return the correct data
- Error use-case results throw the correct `HttpException` status code
- Each service method maps to the right HTTP status

```typescript
describe('UsersService', () => {
  let service: UsersService;
  let mockUserRepository: jest.Mocked<UserRepository>;

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      providers: [
        UsersService,
        {
          provide: UserRepository,
          useValue: { findAll: jest.fn(), findById: jest.fn(), ... },
        },
      ],
    }).compile();
    service = module.get(UsersService);
    mockUserRepository = module.get(UserRepository);
  });
});
```

### 3. Infrastructure — Repositories (`src/<module>/infrastructure/`)
Integration-style tests using TypeORM's in-memory SQLite or a test PostgreSQL.
For unit tests: mock `@InjectRepository` using `getRepositoryToken`.

```typescript
const module = await Test.createTestingModule({
  providers: [
    UserRepository,
    {
      provide: getRepositoryToken(UserEntity),
      useValue: { findOne: jest.fn(), save: jest.fn(), ... },
    },
  ],
}).compile();
```

Test:
- `findById` returns `Either.left(NotFoundError)` when entity not found
- `findById` returns `Either.right(User)` when entity exists
- `create` returns `Either.right(User)` on success
- `update` calls orm.update then re-fetches

### 4. Presentation — Controllers (`src/<module>/presentation/`)
Use `@nestjs/testing` + `supertest`. Mock the service.

```typescript
const module = await Test.createTestingModule({
  controllers: [UsersController],
  providers: [{ provide: UsersService, useValue: mockUsersService }],
}).compile();
const app = module.createNestApplication();
app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
await app.init();
```

Test:
- `GET /users` → 200 with array
- `GET /users/:id` → 200 with user, 404 when not found
- `POST /users` → 201 with created user, 409 on duplicate email
- `PATCH /users/:id` → 200 with updated user
- `DELETE /users/:id` → 204 no body
- Auth guard blocks unauthenticated requests (mock `JwtAuthGuard` for unit tests)

## Test File Naming
Place test files alongside the source: `user.repository.spec.ts` next to `user.repository.ts`.

## Coverage Goals
- All use-cases: happy path + every error path (NotFound, Conflict, Unauthorized, etc.)
- All service methods: HttpException status mapping
- All controller routes: 2xx success + 4xx errors + validation rejection

## Instructions

1. Ask which module to write tests for if not specified (e.g., `users`, `auth`, `members`).
2. Read the existing source files for that module before writing any tests.
3. Write tests layer by layer: use-cases → service → repository → controller.
4. Use `Either.right(...)` and `Either.left(...)` from `src/core/domain/either.ts` in mock return values.
5. Run `npm test -- --testPathPattern=<module>` after writing to verify tests pass.
6. Fix any failing tests before reporting done.
