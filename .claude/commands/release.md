릴리스를 준비합니다. 아래 단계를 순서대로 수행하세요.

## 1. Changeset 생성

`src/` 디렉토리에서 `npx changeset`을 실행하여 changeset 파일을 생성합니다.
- 사용자에게 변경 유형(patch / minor / major)과 변경 설명을 물어보세요.
- changeset 파일이 `src/.changeset/`에 생성되었는지 확인합니다.

## 2. 버전 동기화 검증

`npm run version-packages`를 `src/`에서 실행하여 아래 3개 파일의 버전이 동기화되는지 확인합니다:
- `src/package.json`
- `src/src-tauri/Cargo.toml`
- `src/src-tauri/tauri.conf.json`

동기화 결과를 사용자에게 보여주세요.

## 3. 커밋

변경된 파일들(changeset 파일, 버전 bump된 파일들, CHANGELOG.md)을 커밋합니다.
- 커밋 메시지 형식: `chore: release v{버전}`

## 참고

- master에 push하면 GitHub Actions가 자동으로 3 플랫폼(Windows, macOS, Linux) 빌드 후 GitHub Release에 바이너리를 업로드합니다.
- changeset 파일이 없으면 릴리스가 트리거되지 않습니다.
