@echo off
setlocal

del all-js.txt

for %%a in (*.css) do (
    echo Processing file: %%a
    (
	    echo ```css %%a
      type "%%a"
	    echo.
      echo ```
      echo.
    ) >> all-js.txt
)
for %%a in (*.html) do (
    echo Processing file: %%a
    (
	    echo ```html %%a
      type "%%a"
	    echo.
      echo ```
      echo.
    ) >> all-js.txt
)
for %%a in (*.js) do (
    echo Processing file: %%a
    (
	    echo ```js %%a
      type "%%a"
	    echo.
      echo ```
      echo.
    ) >> all-js.txt
)

for %%a in (*.md) do (
    echo Processing file: %%a
    (
	    echo ```md %%a
      type "%%a"
	    echo.
      echo ```
      echo.
    ) >> all-js.txt
)


(
  echo You are working with a professional software developer.  You don't need to
  echo explain the code you produce.  Please prefer short answers to longer ones.
  echo For small changes, describing the change with a few lines of code is preferred
  echo over rewriting the entire project.
  echo When significant changes are required to a file, present the entire file.
  echo Sometimes you will be asked for design advice.  Please provide the advice without
  echo producing any code.
  echo Prefer writing JavaScript classes to "naked" functions.
) >> all-js.txt

endlocal

notepad all-js.txt
