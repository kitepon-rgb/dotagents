# Lattice ToDo archive
Plan: aishell-factory-integration
Batch: wire-v5-pm-atomicity-cutover
Revision: 7512ac33f30f11f12fe2c57c5dd527363c475ec483aa56a8de00815a0af6dff9

- [ ] Lattice `revise-phase`の非原子的失敗を修理する。v3で`reconciled`なmemberへ`phase_todo_revision.v2`を適用すると拒否されず、manifestとrevision bindingが食い違って以後`todo status`／`verify`が`STORE_INCONSISTENT: manifest_revision_binding_mismatch`で読めなくなる。世代降格を事前に拒否するか、失敗時にstore bytesを不変に保つ
