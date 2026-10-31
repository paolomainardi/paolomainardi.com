# {{ .Title }}
{{ with (or .Params.subtitle .Description) }}
{{ . }}
{{ end }}
{{ with .Params.authors }}Written by {{ delimit . ", " " and " }}, edited by {{ site.Params.author }}{{ else }}By {{ site.Params.author | default site.Title }}{{ end }}, {{ .Date | time.Format "January 2, 2006" }}. {{ .Permalink }}

{{ .RawContent }}
