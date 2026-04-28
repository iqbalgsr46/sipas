# Use Case Diagram

```mermaid
usecaseDiagram
    actor "Admin" as admin
    actor "Staf" as staf
    actor "Pimpinan" as pimpinan

    package "Sistem Informasi Persuratan (SIPAS)" {
        usecase "Kelola User" as UC1
        usecase "Input Surat Masuk" as UC2
        usecase "Buat Surat Keluar" as UC3
        usecase "Approval Surat" as UC4
        usecase "Melihat Notifikasi" as UC5
    }

    admin --> UC1

    staf --> UC2
    staf --> UC3
    staf --> UC5

    pimpinan --> UC4
    pimpinan --> UC5
```
