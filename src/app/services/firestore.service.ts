import { Injectable } from '@angular/core';
import firebase from 'firebase/app';
import '@firebase/firestore';
import {
    AngularFirestore, AngularFirestoreDocument, AngularFirestoreCollection, QueryFn, QueryGroupFn,
    AngularFirestoreCollectionGroup
} from '@angular/fire/firestore';
import { Observable } from 'rxjs';
import { map, take, tap } from 'rxjs/operators';
import { AngularFireDatabase } from '@angular/fire/database';

type CollectionPredicate<T> = string | AngularFirestoreCollection<T>;
type CollectionGroupPredicate<T> = string | AngularFirestoreCollectionGroup<T>;
type DocPredicate<T> = string | AngularFirestoreDocument<T>;

@Injectable({
    providedIn: 'root'
})
export class FirestoreService {
    fieldValue = firebase.firestore.FieldValue;
    docIdField = firebase.firestore.FieldPath.documentId();
    constructor(private db: AngularFirestore, private rdb: AngularFireDatabase) {
        this.db.firestore.settings({
            experimentalForceLongPolling: true
        });
    }

    public enableNetwork() {
        return this.db.firestore.enableNetwork();
    }

    public disableNetwork() {
        return this.db.firestore.disableNetwork();
    }

    public connectedRef() {
        console.log(this.rdb.database.ref('.info/connected'));
        return this.rdb.database.ref('.info/connected');
    }

    /// **************
    /// Create a document id
    /// **************
    public createId(): string {
        return this.db.createId();
    }

    /// **************
    /// Get a Reference
    /// **************
    public col<T>(ref: CollectionPredicate<T>, queryFn?: QueryFn): AngularFirestoreCollection<T> {
        return typeof ref === 'string' ? this.db.collection<T>(ref, queryFn) : ref;
    }

    // eslint-disable-next-line max-len
    public colGroup<T>(ref: CollectionGroupPredicate<T>, queryFn?: QueryGroupFn<T>): AngularFirestoreCollectionGroup<T> {
        return typeof ref === 'string' ? this.db.collectionGroup<T>(ref, queryFn) : ref;
    }

    public doc<T>(ref: DocPredicate<T>): AngularFirestoreDocument<T> {
        return typeof ref === 'string' ? this.db.doc<T>(ref) : ref;
    }

    /// **************
    /// Get Data
    /// **************
    public doc$<T>(ref: DocPredicate<T>): Observable<T> {
        return this.doc(ref).snapshotChanges()
            .pipe(
                map(doc => {
                    if (doc.payload.exists) {
                        const data: any = doc.payload.data();
                        const docRef = doc.payload.ref;
                        return { ref: docRef, ...data } as T;
                    } else {
                        return null;
                    }
                })
            );
    }

    public col$<T>(ref: CollectionPredicate<T>, queryFn?: QueryFn): Observable<T[]> {
        return this.col(ref, queryFn).snapshotChanges()
            .pipe(
                map(docs => docs.map(a => {
                    const data: any = a.payload.doc.data();
                    const docRef = a.payload.doc.ref;
                    return { ref: docRef, ...data };
                }) as T[])
            );
    }

    public colGroup$<T>(ref: CollectionGroupPredicate<T>, queryFn?: QueryGroupFn<T>): Observable<T[]> {
        return this.colGroup(ref, queryFn).snapshotChanges()
            .pipe(
                map(docs => docs.map(a => {
                    const data: any = a.payload.doc.data();
                    const docRef = a.payload.doc.ref;
                    return { ref: docRef, ...data };
                }) as T[])
            );
    }
    public colData$<T>(ref: CollectionPredicate<T>, queryFn?: QueryFn): Observable<T[]> {
        return this.col(ref, queryFn).snapshotChanges()
            .pipe(
                map(docs => docs.map(a => {
                    const data: any = a.payload.doc.data();
                    return data;
                }) as T[])
            );
    }

    public count$<T>(ref: DocPredicate<T>): Observable<number> {
        const afDoc = this.doc(ref);
        return this.col$<any>(`${afDoc.ref.path}/shards`)
            .pipe(
                map(shards => shards && shards.reduce((acc: number, val: any) => acc + val.count, 0) || 0)
            );
    }

    public countOnQuery<T>(ref: CollectionPredicate<T>, queryFn?: QueryFn): Observable<number> {
        return this.col(ref, queryFn).snapshotChanges()
            .pipe(
                map(docs => {
                    if (docs) {
                        return docs.length;
                    } else {
                        return 0;
                    }
                })
            );
    }


    /// **************
    /// Write Data
    /// **************
    /// Firebase Server Timestamp
    get timestamp() {
        return firebase.firestore.Timestamp.now();
    }

    timestampFromDate(startDate: Date) {
        return firebase.firestore.Timestamp.fromDate(startDate);
    }

    getRef(path: string) {
        return this.db.doc(path).ref;
    }

    // set<T>(ref: DocPredicate<T>, data: any): Promise<void> {
    //   const timestamp = this.timestamp;
    //   return this.doc(ref).set({
    //     ...data,
    //     updatedAt: timestamp,
    //     createdAt: timestamp,
    //   });
    // }

    set<T>(ref: DocPredicate<T>, data: any): Promise<void> {
        const doc = this.doc(ref);
        const ids = this.getPathIds(doc);
        const timestamp = this.timestamp;
        return this.doc(ref).set({
            ...data,
            ...ids,
            updatedAt: timestamp,
            createdAt: timestamp,
        });
    }

    setWithMerge<T>(ref: DocPredicate<T>, data: any): Promise<void> {
        const timestamp = this.timestamp;
        return this.doc(ref).set({
            ...data,
            updatedAt: timestamp,
            createdAt: timestamp,
        }, { merge: true });
    }

    update<T>(ref: DocPredicate<T>, data: any): Promise<void> {
        const timestamp = this.timestamp;
        return this.doc(ref).update({
            ...data,
            updatedAt: timestamp,
        });
    }

    delete<T>(ref: DocPredicate<T>): Promise<void> {
        return this.doc(ref).delete();
    }

    // add<T>(ref: CollectionPredicate<T>, data: any): Promise<firebase.firestore.DocumentReference> {
    //   const timestamp = this.timestamp;
    //   return this.col(ref).add({
    //     ...data,
    //     updatedAt: timestamp,
    //     createdAt: timestamp,
    //   });
    // }

    async add<T>(ref: CollectionPredicate<T>, data: any): Promise<firebase.firestore.DocumentReference> {
        const doc = this.col(ref).doc(this.db.createId());
        const ids = this.getPathIds(doc);
        const timestamp = this.timestamp;
        await this.set(doc.ref.path, {
            ...data,
            ...ids,
            updatedAt: timestamp,
            createdAt: timestamp,
        });
        return doc.ref;
    }

    getPathIds(doc: AngularFirestoreDocument<any>) {
        let _docRef = doc.ref;
        const ids = {
            _id: _docRef.id
        };
        let count = 1;
        while (_docRef && _docRef.parent !== null) {
            if (_docRef.parent.parent) {
                ids[`_parent${count}`] = _docRef.parent.parent.id;
                count++;
                _docRef = _docRef.parent.parent;
            } else {
                _docRef = null;
            }
        }
        return ids;
    }

    getDoc<T>(ref: DocPredicate<T>): Promise<T> {
        return this.doc<any>(ref).snapshotChanges()
            .pipe(
                take(1),
                map(doc => {
                    if (doc.payload.exists) {
                        const data: any = doc.payload.data();
                        const docRef = doc.payload.ref;
                        return { ref: docRef, ...data } as T;
                    } else {
                        return null;
                    }
                })
            ).toPromise();
    }



    async upsert<T>(ref: DocPredicate<T>, data: any): Promise<void> {
        const snap = await this.doc(ref).snapshotChanges().pipe(take(1)).toPromise();
        return snap.payload.exists ? this.update(ref, data) : this.set(ref, data);
    }

    async exists<T>(ref: DocPredicate<T>): Promise<boolean> {
        const snap = await this.doc(ref).snapshotChanges().pipe(take(1)).toPromise();
        return snap.payload.exists;
    }

    async getFirstDoc<T>(ref: CollectionPredicate<T>, queryFn?: QueryFn): Promise<any> {
        const snap = await this.col(ref, queryFn).get().toPromise();
        if (!snap.empty) {
            const d = snap.docs[0];
            return { ref: d.ref, ...d.data() };
        } else {
            return null;
        }
    }

    async getLastDoc<T>(ref: CollectionPredicate<T>): Promise<any> {
        // eslint-disable-next-line no-shadow
        const snap = await this.col(ref, reff => reff
            .orderBy('createdAt', 'desc')
            .limit(1)
        ).get().toPromise();
        if (!snap.empty) {
            const d = snap.docs[0];
            return { ref: d.ref, ...d.data() };
        } else {
            return null;
        }
    }
    /// **************
    /// Inspect Data
    /// **************
    inspectDoc(ref: DocPredicate<any>): void {
        const tick = new Date().getTime();
        this.doc(ref).snapshotChanges()
            .pipe(
                take(1),
                tap(d => {
                    const tock = new Date().getTime() - tick;
                    // eslint-disable-next-line no-console
                    console.log(`Loaded Document in ${tock}ms`, d);
                })
            )
            .subscribe();
    }

    inspectCol(ref: CollectionPredicate<any>): void {
        const tick = new Date().getTime();
        this.col(ref).snapshotChanges()
            .pipe(
                take(1),
                tap(c => {
                    const tock = new Date().getTime() - tick;
                    // eslint-disable-next-line no-console
                    console.log(`Loaded Collection in ${tock}ms`, c);
                })
            )
            .subscribe();
    }
    /// **************
    /// Create and read doc references
    /// **************
    /// create a reference between two documents
    connect(host: DocPredicate<any>, key: string, doc: DocPredicate<any>) {
        return this.doc(host).update({ [key]: this.doc(doc).ref });
    }
    /// returns a documents references mapped to AngularFirestoreDocument

}
