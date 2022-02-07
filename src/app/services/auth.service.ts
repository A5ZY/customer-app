import { Injectable } from '@angular/core';
import { AngularFireAuth } from '@angular/fire/auth';
import firebase from 'firebase/app';
import '@firebase/auth';
import { take } from 'rxjs/operators';

@Injectable({
    providedIn: 'root'
})
export class AuthService {

    userCredential: firebase.auth.UserCredential;
    private _currentUser: firebase.User;
    constructor(
        private afa: AngularFireAuth) {
        this.afa.useDeviceLanguage();
        this.afa.authState.subscribe(user => {
            this._currentUser = user;
        });
    }


    getCurrentUser() {
        return new Promise<firebase.User>(async (resolve, reject) => {
            try {
                if (this._currentUser) {
                    resolve(this._currentUser);
                } else {
                    this._currentUser = await this.afa.authState.pipe(take(1)).toPromise();
                    resolve(this._currentUser);
                }
            } catch (error) {
                reject(error);
            }
        });
    }

    async logout() {
        return new Promise<boolean>(async (resolve, reject) => {
            try {
                await this.afa.signOut();
                this.userCredential = undefined;
                this._currentUser = undefined;
                const timeout1 = setTimeout(() => {
                    resolve(true);
                    clearTimeout(timeout1);
                }, 1000);
            } catch (error) {
                reject(error);
            }
        });
    }

    login(email: string, password: string) {
        return new Promise<boolean>(async (resolve, reject) => {
            try {
                this.userCredential = await this.afa.signInWithEmailAndPassword(email, password);
                this._currentUser = this.userCredential.user;
                resolve(true);
            } catch (error) {
                reject(error);
            }
        });

    }

    reauthenticate(email: string, password: string) {
        return new Promise<boolean>(async (resolve, reject) => {
            try {
                this.userCredential = await this.afa.signInWithEmailAndPassword(email, password);
                this._currentUser = this.userCredential.user;
                resolve(true);
            } catch (error) {
                reject(error);
            }
        });
    }

    confirmPasswordReset(code: string, newPassword: string) {
        return new Promise<boolean>(async (resolve, reject) => {
            try {
                const res = await this.afa.verifyPasswordResetCode(code);
                await this.afa.confirmPasswordReset(code, newPassword);
                resolve(true);
            } catch (error) {
                reject(error);
            }
        });
    }



    signUp(email: string, password: string) {
        return new Promise<firebase.User>(async (resolve, reject) => {
            try {
                this.userCredential = await this.afa.createUserWithEmailAndPassword(email, password);
                resolve(this.userCredential.user);
            } catch (error) {
                reject(error);
            }
        });
    }

    forgotPassword(email: string) {
        return new Promise<boolean>(async (resolve, reject) => {
            try {
                await this.afa.sendPasswordResetEmail(email);
                resolve(true);
            } catch (error) {
                reject(error);
            }
        });
    }


}
