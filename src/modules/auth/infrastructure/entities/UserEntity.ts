import { Entity, PrimaryColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';

@Entity('users')
export class UserEntity {
    @PrimaryColumn('uuid')
    id: string;
    
    @Column({ unique: true })
    email: string;
    
    @Column()
    password: string;
    
    @Column({ nullable: true })
    firstName?: string;
    
    @Column({ nullable: true })
    lastName?: string;
    
    @Column({ default: true })
    isActive: boolean;
    
    @Column({ nullable: true })
    refreshToken?: string;
    
    @CreateDateColumn()
    createdAt: Date;
    
    @UpdateDateColumn()
    updatedAt: Date;
} 