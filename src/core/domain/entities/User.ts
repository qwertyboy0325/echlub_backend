import { AggregateRoot } from '../../../shared/domain/AggregateRoot';

export type UserProps = {
    email: string;
    password: string;
    firstName?: string;
    lastName?: string;
    isActive: boolean;
    refreshToken?: string;
    createdAt: Date;
    updatedAt: Date;
};

export class User extends AggregateRoot<string> {
    private readonly _email: string;
    private readonly _password: string;
    private readonly _firstName?: string;
    private readonly _lastName?: string;
    private readonly _isActive: boolean;
    private readonly _refreshToken?: string;
    private readonly _createdAt: Date;
    private readonly _updatedAt: Date;
    
    private constructor(
        id: string,
        props: UserProps
    ) {
        super(id);
        this._email = props.email;
        this._password = props.password;
        this._firstName = props.firstName;
        this._lastName = props.lastName;
        this._isActive = props.isActive;
        this._refreshToken = props.refreshToken;
        this._createdAt = props.createdAt;
        this._updatedAt = props.updatedAt;
    }
    
    public static create(
        id: string,
        props: UserProps
    ): User {
        return new User(id, props);
    }
    
    get email(): string {
        return this._email;
    }
    
    get password(): string {
        return this._password;
    }
    
    get firstName(): string | undefined {
        return this._firstName;
    }
    
    get lastName(): string | undefined {
        return this._lastName;
    }
    
    get isActive(): boolean {
        return this._isActive;
    }
    
    get refreshToken(): string | undefined {
        return this._refreshToken;
    }
    
    get createdAt(): Date {
        return this._createdAt;
    }
    
    get updatedAt(): Date {
        return this._updatedAt;
    }
    
    public withUpdatedEmail(email: string): User {
        return new User(this.id, {
            ...this.getProps(),
            email,
            updatedAt: new Date()
        });
    }
    
    public withUpdatedPassword(password: string): User {
        return new User(this.id, {
            ...this.getProps(),
            password,
            updatedAt: new Date()
        });
    }
    
    public withUpdatedName(firstName?: string, lastName?: string): User {
        return new User(this.id, {
            ...this.getProps(),
            firstName,
            lastName,
            updatedAt: new Date()
        });
    }
    
    public withUpdatedRefreshToken(refreshToken?: string): User {
        return new User(this.id, {
            ...this.getProps(),
            refreshToken,
            updatedAt: new Date()
        });
    }
    
    public deactivate(): User {
        return new User(this.id, {
            ...this.getProps(),
            isActive: false,
            updatedAt: new Date()
        });
    }
    
    public activate(): User {
        return new User(this.id, {
            ...this.getProps(),
            isActive: true,
            updatedAt: new Date()
        });
    }
    
    private getProps(): UserProps {
        return {
            email: this._email,
            password: this._password,
            firstName: this._firstName,
            lastName: this._lastName,
            isActive: this._isActive,
            refreshToken: this._refreshToken,
            createdAt: this._createdAt,
            updatedAt: this._updatedAt
        };
    }
} 