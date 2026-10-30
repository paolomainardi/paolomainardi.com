# {{ .Title }}
{{ with (or .Params.subtitle .Description) }}
{{ . }}
{{ end }}
By {{ site.Params.author | default site.Title }}, {{ .Date | time.Format "January 2, 2006" }}. {{ .Permalink }}

{{ .RawContent }}
